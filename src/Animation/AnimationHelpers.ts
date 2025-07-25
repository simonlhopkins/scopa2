import TweenChain = Phaser.Tweens.TweenChain;

class AnimationHelpers{
    
    static ForceFinishTween(tween: Phaser.Tweens.Tween|Phaser.Tweens.TweenChain): void {
        if(tween instanceof Phaser.Tweens.TweenChain){
            const chain:TweenChain = tween;
            AnimationHelpers.SeekTweenToEnd(chain.currentTween);
            console.log(chain.currentTween)
            while (!chain.nextTween()){
                if(chain.currentTween){
                    AnimationHelpers.SeekTweenToEnd(chain.currentTween);
                }
            }
        }else{
            AnimationHelpers.SeekTweenToEnd(tween)
        }
        tween.complete();
    }

    private static SeekTweenToEnd(tween:Phaser.Tweens.Tween){
        tween.seek(tween.duration+100);
    }
}

export default AnimationHelpers;